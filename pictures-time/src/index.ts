import { Context, Schema, Logger, h } from 'koishi'
import fs from 'fs';
import path from 'path';

export const name = 'pictures-time'

export const usage = '## 使用指令“pictime”或“图图time”来记录指令调用者发的图图\n'+
"### 启用后发送“over”或“停止”来终止记录图图\n"+
"### 只测试了gocq和windows（笨懒阿林）\n"+
"安装后即可启用，路径缺省时将会在data文件夹内新建image-time文件夹来存储\n"+
"### [问题反馈](https://github.com/Alin-sky/koishi-plugin-pictures-time/issues)"



export interface Config {
  paths: string
}
export const Config: Schema<Config> = Schema.object({
  paths: Schema.string().description('存储路径'),
})

var path1 = ''

const log1 = "pictures-time"
const logger: Logger = new Logger(log1)

declare module 'koishi' {
  interface Tables {
    pictime: Pictime
  }
}

// 这里是新增表的接口类型
export interface Pictime {
  id: number
  uname: string
  guildid: number
  sum: number
}


export async function apply(ctx: Context, config: Config) {

  config.paths == null ?
    path1 = (path.join(__dirname, '../../../data'))
    : path1 = config.paths
  ctx.model.extend('pictime', {
    // 各字段的类型声明
    id: 'unsigned',
    uname: 'char',
    guildid: 'unsigned',
    sum: 'unsigned'
  })

  //定义函数区
  //const dir = 
  async function loadImageFromUrl_1(url: string): Promise<Buffer> {
    const imageData = await ctx.http.get(url, { responseType: 'arraybuffer' });
    if (!imageData) {
      throw new Error('No image data');
    }
    // 直接返回 Buffer，不再调用 loadImage
    return Buffer.from(imageData);
  }
  //文件夹创建函数

  function createDir(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(dirPath)) {
        logger.info(`目录已存在：${dirPath}`);
        resolve();
      } else {
        fs.mkdir(dirPath, { recursive: true }, (err) => {
          if (err) {
            reject(err);
          } else {
            logger.info(`已创建：${dirPath}`);
            resolve();
          }
        });
      }
    });
  }



  async function saveImage_pro(imageElement: string, savePath: string): Promise<void> {
    const urlMatch = imageElement.match(/url="([^"]+)"/);
    const fileMatch = imageElement.match(/file="([^"]+)"/);
    if (!urlMatch || !fileMatch) {
      throw new Error('Invalid image element string');
    }
    const url = urlMatch[1];
    let fileName = fileMatch[1];
    // 清理文件名中的非法字符
    fileName = fileName.replace(/[<>:"\/\\|?*]+/g, '') + '.png';
    // 确保保存路径存在
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    try {
      const imageBuffer = await loadImageFromUrl_1(url);
      const filePath = path.join(savePath, fileName);
      fs.writeFileSync(filePath, imageBuffer);
    } catch (error) {
      logger.info(error)
    }
  }

  try {
    path1 += '/image-time'
    await createDir(path1)
  } catch (error) {
    logger.info(error)
    path1 = (path.join(__dirname, '../../../data/image-time'))
    createDir(path1)
  }
  var uid: number
  var gid: number
  var usename
  let i = 0
  let n = 0
  let e = 0
  ctx.command('pictime', '图图时间')
    .alias('图图time')
    .action(async ({ session }, ...args) => {
      uid = Number(session.userId)
      usename = (session.author).name
      gid = Number(session.guild)

      session.send(h('at', { id: session.userId }) + ' 开始记录啦')
      const PICTIME = ctx.middleware(async (session, next) => {
        if (/image file/.test(session.content)
          && uid == Number(session.userId)) {
          for (let ii = 0; ii < 2; ii++) {
            try {
              await saveImage_pro(session.content,
                (path1)).then(() => logger.info('下载成功'))
              break
            } catch (error) {
              logger.info(error)
              e++
            }
          }
          n++
        } if (session.content === 'over' || session.content == '停止') {
          PICTIME()
          //写库
          const data = await ctx.database.get('pictime', session.userId)
          console.log(data)
          data[0] == null ? i = n : i = n += (data[0].sum)
          await ctx.database.upsert('pictime', [
            {
              id: Number(session.userId),
              uname: usename,
              guildid: Number(session.guildId),
              sum: i
            },
          ])
          await session.send(`成功下载${n}张图图,\n${e}张图图下载出错`)
        }
        return next()
      })
    })

  ctx.command('pictime.rankings')
    .action(async ({ session }, ...args) => {
      const data = await ctx.database.get('pictime', {})
      if (data[0] == null) {
        return '呜呜，数据库没有数据'
      }
      let top: { tops: Number; uid: Number; unam: string }
      let array = []
      let messages = []
      let uname
      for (let i = 0; i < data.length; i++) {
        top = { tops: data[i].sum, uid: data[i].id ,unam:data[i].uname}
        array.push(top)
      }
      console.log(array.sort((a, b) => b.tops - a.tops))//排序
      messages.push('发图数量排名：\n')
      if (array.length >= 10) {
        for (let i = 0; i < 10; i++) {
          messages.push(`第${i+1}名\n${array[i].unam}—发图：${array[i].tops}张\n`)
        }
      } else {
        for (let i = 0; i < array.length; i++) {
          messages.push(`第${i+1}名\n${array[i].unam}—发图：${array[i].tops}张\n`)
        }
      }
      session.send(messages)

    })

}
