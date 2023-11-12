import { Context, Schema } from 'koishi';
export declare const name = "pictures-time";
export declare const usage: string;
export interface Config {
    paths: string;
}
export declare const Config: Schema<Config>;
declare module 'koishi' {
    interface Tables {
        pictime: Pictime;
    }
}
export interface Pictime {
    id: number;
    uname: string;
    guildid: number;
    sum: number;
}
export declare function apply(ctx: Context, config: Config): Promise<void>;
