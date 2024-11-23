type Side =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "front"
    | "back"
    | (string & {});
type MouseButton = 1 | 2 | 3;

export type TransferredFiles = {
    getFiles: () => TransferredFile[];
};
export type TransferredFile = ReadFileHandle & {
    getName: () => string;
};

export interface Events {
    /**
     * @see https://tweaked.cc/event/alarm.html
     */
    alarm: [id: /** The ID of the alarm that finished */ number];
    /**
     * @see https://tweaked.cc/event/char.html
     */
    char: [character: /** The character that was pressed */ string];
    /**
     * @see https://tweaked.cc/event/computer_command.html
     */
    computer_command: [
        ...args: /** The arguments passed to the command */ string[]
    ];
    /**
     * @see https://tweaked.cc/event/disk.html
     */
    disk: [side: /** The side the disk was attached to */ Side];
    /**
     * @see https://tweaked.cc/event/disk_eject.html
     */
    disk_eject: [
        side: /** The side of the disk drive that had a disk removed */ Side
    ];
    /**
     * @see https://tweaked.cc/event/file_transfer.html
     */
    file_transfer: [files: TransferredFiles];
    /**
     * @see https://tweaked.cc/event/http_check.html
     */
    http_check: [
        url: /** The URL to be checked */ string,
        success: /** Whether the check succeeded */ boolean,
        error?: /** If the check failed, a reason explaining why the check failed. */ string
    ];
    /**
     * @see https://tweaked.cc/event/http_failure.html
     */
    http_failure: [
        url: /** The URL of the site requested */ string,
        error: /** The error that occurred */ string,
        response?: /** A response handle if the connection succeeded, but the server's response indicated failure. */ HTTPResponse
    ];
    /**
     * @see https://tweaked.cc/event/http_success.html
     */
    http_success: [
        url: /** The URL of the site requested */ string,
        response: /** The successful HTTP response */ HTTPResponse
    ];
    /**
     * @see https://tweaked.cc/event/key.html
     */
    key: [
        key: /** The numerical key value of the key pressed */ number,
        hold: /** Whether the key event was generated while holding the key (true), rather than pressing it the first time (false). */ boolean
    ];
    /**
     * @see https://tweaked.cc/event/key_up.html
     */
    key_up: [key: /** The numerical key value of the key pressed */ number];
    /**
     * @see https://tweaked.cc/event/modem_message.html
     */
    modem_message: [
        side: /** The side of the modem that received the message */ Side,
        channel: /** The channel that the message was sent on */ number,
        replyChannel: /** The reply channel set by the sender */ number,
        message: /** The message as sent by the sender */ unknown,
        distance?: /** The distance between the sender and the receiver in blocks, or nil if the message was sent between dimensions */ number
    ];
    /**
     * @see https://tweaked.cc/event/monitor_resize.html
     */
    monitor_resize: [
        side: /** The side of the monitor that was resized */ Side
    ];
    /**
     * @see https://tweaked.cc/event/monitor_touch.html
     */
    monitor_touch: [
        side: /** The side or network ID of the monitor that was touched */ Side,
        x: /** The X coordinate of the touch, in characters */ number,
        y: /** The Y coordinate of the touch, in characters */ number
    ];
    /**
     * @see https://tweaked.cc/event/mouse_click.html
     */
    mouse_click: [
        button: /** The mouse button that was clicked */ MouseButton,
        x: /** The X coordinate of the click */ number,
        y: /** The Y coordinate of the click */ number
    ];
    /**
     * @see https://tweaked.cc/event/mouse_drag.html
     */
    mouse_drag: [
        button: /** The mouse button that was clicked */ MouseButton,
        x: /** The X coordinate of the click */ number,
        y: /** The Y coordinate of the click */ number
    ];
    /**
     * @see https://tweaked.cc/event/mouse_scroll.html
     */
    mouse_scroll: [
        direction: /** The direction of the scroll. (-1 = up, 1 = down) */ number,
        x: /** The X-coordinate of the mouse when scrolling */ number,
        y: /** The Y-coordinate of the mouse when scrolling */ number
    ];
    /**
     * @see https://tweaked.cc/event/mouse_up.html
     */
    mouse_up: [
        button: /** The mouse button that was released */ MouseButton,
        x: /** The X coordinate of the release */ number,
        y: /** The Y coordinate of the release */ number
    ];
    /**
     * @see https://tweaked.cc/event/paste.html
     */
    paste: [text: /** The text that was pasted */ string];
    /**
     * @see https://tweaked.cc/event/peripheral.html
     */
    peripheral: [
        side: /** The side the peripheral that was attached to */ Side
    ];
    /**
     * @see https://tweaked.cc/event/peripheral_detach.html
     */
    peripheral_detach: [
        side: /** The side the peripheral that was detached from */ Side
    ];
    /**
     * @see https://tweaked.cc/event/rednet_message.html
     */
    rednet_message: [
        id: /** The ID of the sending computer */ number,
        message: /** The message sent */ unknown,
        protocol?: /** The protocol of the message, if provided */ string
    ];
    /**
     * @see https://tweaked.cc/event/redstone.html
     */
    redstone: [];
    /**
     * @see https://tweaked.cc/event/speaker_audio_empty.html
     */
    speaker_audio_empty: [
        side: /** The name of the speaker which is available to play more audio. */ Side
    ];
    /**
     * @see https://tweaked.cc/event/task_complete.html
     */
    task_complete: [
        id: /** The ID of the task that completed */ number,
        success: /** Whether the command succeeded */ boolean,
        error?: /** If the command failed, an error message explaining the failure. (This is not present if the command succeeded.) */ string,
        ...args: /** Any parameters returned from the command */ unknown[]
    ];
    /**
     * @see https://tweaked.cc/event/term_resize.html
     */
    term_resize: [];
    /**
     * @see https://tweaked.cc/event/terminate.html
     */
    terminate: [];
    /**
     * @see https://tweaked.cc/event/timer.html
     */
    timer: [id: /** The ID of the timer that finished */ number];
    /**
     * @see https://tweaked.cc/event/turtle_inventory.html
     */
    turtle_inventory: [];
    /**
     * @see https://tweaked.cc/event/websocket_closed.html
     */
    websocket_closed: [
        url: /** The URL of the WebSocket that was closed */ string,
        reason?: /** The server-provided reason the websocket was closed. This will be nil if the connection was closed abnormally. */ string,
        code?: /** The connection close code, indicating why the socket was closed. This will be nil if the connection was closed abnormally. */ number
    ];
    /**
     * @see https://tweaked.cc/event/websocket_failure.html
     */
    websocket_failure: [
        url: /** The URL of the WebSocket that failed */ string,
        error: /** The error that occurred */ string
    ];
    /**
     * @see https://tweaked.cc/event/websocket_message.html
     */
    websocket_message: [
        url: /** The URL of the WebSocket that received the message */ string,
        message: /** The message received */ string,
        binary: /** Whether the message is binary */ boolean
    ];
    /**
     * @see https://tweaked.cc/event/websocket_success.html
     */
    websocket_success: [
        url: /** The URL of the WebSocket that received the message */ string,
        response: /** The successful HTTP response */ HTTPResponse
    ];
    [key: string & {}]: any[];
}
