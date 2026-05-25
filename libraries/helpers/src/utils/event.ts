// You may comment out any events you don't need to save space. Make sure to
// delete them from eventInitializers as well.

export interface IEvent {
    get name(): string;
    get args(): any[];
    _type: string;
}

export class CharEvent implements IEvent {
    public character: string = "";
    public readonly _type = "char";
    public get name() {
        return "char" as const;
    }
    public get args() {
        return [this.character];
    }
    public static init(args: any[]): IEvent | null {
        if (!(typeof args[0] === "string") || (args[0] as string) != "char")
            return null;
        let ev = new CharEvent();
        ev.character = args[1] as string;
        return ev;
    }
}

export class KeyEvent implements IEvent {
    public key: Key = 0;
    public isHeld: boolean = false;
    public isUp: boolean = false;
    public readonly _type = "key";
    public get name() {
        return this.isUp ? "key_up" : "key";
    }
    public get args() {
        return [this.key, this.isUp ? null : this.isHeld];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "key" && (args[0] as string) != "key_up")
        )
            return null;
        let ev = new KeyEvent();
        ev.key = args[1] as number;
        ev.isUp = (args[0] as string) == "key_up";
        ev.isHeld = ev.isUp ? false : (args[2] as boolean);
        return ev;
    }
}

export class PasteEvent implements IEvent {
    public text: string = "";
    public readonly _type = "paste";
    public get name() {
        return "paste" as const;
    }
    public get args() {
        return [this.text as any];
    }
    public static init(args: any[]): IEvent | null {
        if (!(typeof args[0] === "string") || (args[0] as string) != "paste")
            return null;
        let ev = new PasteEvent();
        ev.text = args[1] as string;
        return ev;
    }
}

export class TimerEvent implements IEvent {
    public id: number = 0;
    public isAlarm: boolean = false;
    public readonly _type = "timer";
    public get name() {
        return this.isAlarm ? "alarm" : "timer";
    }
    public get args() {
        return [this.id];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "timer" && (args[0] as string) != "alarm")
        )
            return null;
        let ev = new TimerEvent();
        ev.id = args[1] as number;
        ev.isAlarm = (args[0] as string) == "alarm";
        return ev;
    }
}

export class TaskCompleteEvent implements IEvent {
    public id: number = 0;
    public success: boolean = false;
    public error: string | null = null;
    public params: any[] = [];
    public readonly _type = "task_complete";
    public get name() {
        return "task_complete" as const;
    }
    public get args() {
        if (this.success) return [this.id, this.success].concat(this.params);
        else return [this.id, this.success, this.error];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "task_complete"
        )
            return null;
        let ev = new TaskCompleteEvent();
        ev.id = args[1] as number;
        ev.success = args[2] as boolean;
        if (ev.success) {
            ev.error = null;
            ev.params = args.slice(3);
        } else {
            ev.error = args[3] as string;
            ev.params = [];
        }
        return ev;
    }
}

export class RedstoneEvent implements IEvent {
    public readonly _type = "redstone";
    public get name() {
        return "redstone" as const;
    }
    public get args() {
        return [];
    }
    public static init(args: any[]): IEvent | null {
        if (!(typeof args[0] === "string") || (args[0] as string) != "redstone")
            return null;
        let ev = new RedstoneEvent();
        return ev;
    }
}

export class TerminateEvent implements IEvent {
    public readonly _type = "terminate";
    public get name() {
        return "terminate" as const;
    }
    public get args() {
        return [];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "terminate"
        )
            return null;
        let ev = new TerminateEvent();
        return ev;
    }
}

export class DiskEvent implements IEvent {
    public side: string = "";
    public eject: boolean = false;
    public readonly _type = "disk";
    public get name() {
        return this.eject ? "disk_eject" : "disk";
    }
    public get args() {
        return [this.side];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "disk" &&
                (args[0] as string) != "disk_eject")
        )
            return null;
        let ev = new DiskEvent();
        ev.side = args[1] as string;
        ev.eject = (args[0] as string) == "disk_eject";
        return ev;
    }
}

export class PeripheralEvent implements IEvent {
    public side: string = "";
    public detach: boolean = false;
    public readonly _type = "peripheral";
    public get name() {
        return this.detach ? "peripheral_detach" : "peripheral";
    }
    public get args() {
        return [this.side];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "peripheral" &&
                (args[0] as string) != "peripheral_detach")
        )
            return null;
        let ev = new PeripheralEvent();
        ev.side = args[1] as string;
        ev.detach = (args[0] as string) == "peripheral_detach";
        return ev;
    }
}

export class RednetMessageEvent<Message extends any = any> implements IEvent {
    public sender: number = 0;
    public message!: Message;
    public protocol: string | null = null;
    public readonly _type = "rednet_message";
    public get name() {
        return "rednet_message" as const;
    }
    public get args() {
        return [this.sender, this.message, this.protocol];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "rednet_message"
        )
            return null;
        let ev = new RednetMessageEvent();
        ev.sender = args[1] as number;
        ev.message = args[2];
        ev.protocol = args[3] as string;
        return ev;
    }
}

export class ModemMessageEvent implements IEvent {
    public side: string = "";
    public channel: number = 0;
    public replyChannel: number = 0;
    public message: any;
    public distance: number = 0;
    public readonly _type = "modem_message";
    public get name() {
        return "modem_message" as const;
    }
    public get args() {
        return [
            this.side,
            this.channel,
            this.replyChannel,
            this.message,
            this.distance,
        ];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "modem_message"
        )
            return null;
        let ev = new ModemMessageEvent();
        ev.side = args[1] as string;
        ev.channel = args[2] as number;
        ev.replyChannel = args[3] as number;
        ev.message = args[4];
        ev.distance = args[5] as number;
        return ev;
    }
}

export class HTTPEvent implements IEvent {
    public url: string = "";
    public handle: HTTPResponse | null = null;
    public error: string | null = null;
    public readonly _type = "http";
    public get name() {
        return this.error == null ? "http_success" : "http_failure";
    }
    public get args() {
        return [
            this.url,
            this.error == null ? this.handle : this.error,
            this.error != null ? this.handle : null,
        ];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "http_success" &&
                (args[0] as string) != "http_failure")
        )
            return null;
        let ev = new HTTPEvent();
        ev.url = args[1] as string;
        if ((args[0] as string) == "http_success") {
            ev.error = null;
            ev.handle = args[2] as HTTPResponse;
        } else {
            ev.error = args[2] as string;
            if (ev.error == null) ev.error = "";
            ev.handle = args[3] as HTTPResponse;
        }
        return ev;
    }
}

export class WebSocketEvent implements IEvent {
    public handle: WebSocket | null = null;
    public error: string | null = null;
    public readonly _type = "websocket";
    public get name() {
        return this.error == null ? "websocket_success" : "websocket_failure";
    }
    public get args() {
        return [this.handle == null ? this.error : this.handle];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "websocket_success" &&
                (args[0] as string) != "websocket_failure")
        )
            return null;
        let ev = new WebSocketEvent();
        if ((args[0] as string) == "websocket_success") {
            ev.handle = args[1] as WebSocket;
            ev.error = null;
        } else {
            ev.error = args[1] as string;
            ev.handle = null;
        }
        return ev;
    }
}

export enum MouseEventType {
    Click,
    Up,
    Scroll,
    Drag,
    Touch,
    Move,
}

export class MouseEvent implements IEvent {
    public button: number = 0;
    public x: number = 0;
    public y: number = 0;
    public side: string | null = null;
    public type: MouseEventType = MouseEventType.Click;
    public readonly _type = "mouse";
    public get name() {
        return {
            [MouseEventType.Click]: "mouse_click",
            [MouseEventType.Up]: "mouse_up",
            [MouseEventType.Scroll]: "mouse_scroll",
            [MouseEventType.Drag]: "mouse_drag",
            [MouseEventType.Touch]: "monitor_touch",
            [MouseEventType.Move]: "mouse_move",
        }[this.type] as
            | "mouse_click"
            | "mouse_up"
            | "mouse_scroll"
            | "mouse_drag"
            | "monitor_touch"
            | "mouse_move";
    }
    public get args() {
        return [
            this.type == MouseEventType.Touch ? this.side : this.button,
            this.x,
            this.y,
        ];
    }
    public static init(args: any[]): IEvent | null {
        if (!(typeof args[0] === "string")) return null;
        let ev = new MouseEvent();
        const type = args[0] as string;
        if (type == "mouse_click") {
            ev.type = MouseEventType.Click;
            ev.button = args[1] as number;
            ev.side = null;
        } else if (type == "mouse_up") {
            ev.type = MouseEventType.Up;
            ev.button = args[1] as number;
            ev.side = null;
        } else if (type == "mouse_scroll") {
            ev.type = MouseEventType.Scroll;
            ev.button = args[1] as number;
            ev.side = null;
        } else if (type == "mouse_drag") {
            ev.type = MouseEventType.Drag;
            ev.button = args[1] as number;
            ev.side = null;
        } else if (type == "monitor_touch") {
            ev.type = MouseEventType.Touch;
            ev.button = 0;
            ev.side = args[1] as string;
        } else if (type == "mouse_move") {
            ev.type = MouseEventType.Move;
            ev.button = args[1] as number;
            ev.side = null;
        } else return null;
        ev.x = args[2] as number;
        ev.y = args[3] as number;
        return ev;
    }
}

export class ResizeEvent implements IEvent {
    public side: string | null = null;
    public readonly _type = "resize";
    public get name() {
        return this.side == null ? "term_resize" : "monitor_resize";
    }
    public get args() {
        return [this.side];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            ((args[0] as string) != "term_resize" &&
                (args[0] as string) != "monitor_resize")
        )
            return null;
        let ev = new ResizeEvent();
        if ((args[0] as string) == "monitor_resize")
            ev.side = args[1] as string;
        else ev.side = null;
        return ev;
    }
}

export class TurtleInventoryEvent implements IEvent {
    public readonly _type = "turtle_inventory";
    public get name(): "turtle_inventory" {
        return "turtle_inventory";
    }
    public get args() {
        return [];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "turtle_inventory"
        )
            return null;
        let ev = new TurtleInventoryEvent();
        return ev;
    }
}

class SpeakerAudioEmptyEvent implements IEvent {
    public side: string = "";
    public readonly _type = "speaker_audio_empty";
    public get name(): "speaker_audio_empty" {
        return "speaker_audio_empty";
    }
    public get args() {
        return [this.side];
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "speaker_audio_empty"
        )
            return null;
        let ev: SpeakerAudioEmptyEvent;
        //@ts-ignore
        ev.side = args[1] as string;
        //@ts-ignore
        return ev;
    }
}

class ComputerCommandEvent implements IEvent {
    public _args: string[] = [];
    public readonly _type = "computer_command";
    public get name(): "computer_command" {
        return "computer_command";
    }
    public get args() {
        return this._args;
    }
    public static init(args: any[]): IEvent | null {
        if (
            !(typeof args[0] === "string") ||
            (args[0] as string) != "computer_command"
        )
            return null;
        let ev = new ComputerCommandEvent();
        ev._args = args.slice(1);
        return ev;
    }
}

/*
class Event implements IEvent {
    
    public get name() {return "";}
    public get args() {return [(: any)];}
    public static init(args: any[]): IEvent | null {
        if (!(typeof args[0] === "string") || (args[0] as string) != "") return null;
        let ev: Event;

        return ev;
    }
}
*/

export class GenericEvent implements IEvent {
    public _args: any[] = [];
    public readonly _type = "generic";
    public get name() {
        return this.args[0] as string & {};
    }
    public get args() {
        return this.args.slice(1);
    }
    public static init(args: any[]): IEvent | null {
        let ev = new GenericEvent();
        ev._args = args;
        return ev;
    }
}

let eventInitializers: ((args: any[]) => IEvent | null)[] = [
    CharEvent.init,
    KeyEvent.init,
    PasteEvent.init,
    TimerEvent.init,
    TaskCompleteEvent.init,
    RedstoneEvent.init,
    TerminateEvent.init,
    DiskEvent.init,
    PeripheralEvent.init,
    RednetMessageEvent.init,
    ModemMessageEvent.init,
    HTTPEvent.init,
    WebSocketEvent.init,
    MouseEvent.init,
    ResizeEvent.init,
    TurtleInventoryEvent.init,
    SpeakerAudioEmptyEvent.init,
    ComputerCommandEvent.init,
    GenericEvent.init,
];

export type NonGenericEvent =
    | CharEvent
    | KeyEvent
    | PasteEvent
    | TimerEvent
    | TaskCompleteEvent
    | RedstoneEvent
    | TerminateEvent
    | DiskEvent
    | PeripheralEvent
    | RednetMessageEvent
    | ModemMessageEvent
    | HTTPEvent
    | WebSocketEvent
    | MouseEvent
    | ResizeEvent
    | TurtleInventoryEvent
    | SpeakerAudioEmptyEvent
    | ComputerCommandEvent;

export type AnyEvent = NonGenericEvent | GenericEvent;

export type Events = {
    [Event in NonGenericEvent as Event["name"]]: Event;
} & Record<string & {}, GenericEvent>;

type Constructor<T extends {} = {}> = new (...args: any[]) => T;
export function pullEventRaw(filter: string | null = null): AnyEvent | null {
    let args = coroutine.yield(filter);
    for (let init of eventInitializers) {
        let ev = init(args) as AnyEvent;
        if (ev != null) return ev;
    }
    return GenericEvent.init(args) as AnyEvent;
}
export function pullEvent(filter: string | null = null): AnyEvent | null {
    let ev = pullEventRaw(filter);
    if (ev instanceof TerminateEvent) throw "Terminated";
    return ev;
}
export function pullEventRawAs<T extends IEvent>(
    type: Constructor<T>,
    filter: string | null = null
): T | null {
    let ev = pullEventRaw(filter);
    if (ev instanceof type) return ev as T;
    else return null;
}
export function pullEventAs<T extends IEvent>(
    type: Constructor<T>,
    filter: string | null = null
): T | null {
    let ev = pullEvent(filter);
    if (ev instanceof type) return ev as T;
    else return null;
}
