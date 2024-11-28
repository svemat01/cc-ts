/**
 * @module types
 * @description Core type definitions for ComputerCraft TypeScript events and interactions
 *
 * This module provides TypeScript type definitions for ComputerCraft's event system,
 * peripheral interactions, and common data structures. It enables type-safe handling
 * of ComputerCraft events and peripherals in TypeScript projects.
 *
 * @example Basic event handling
 * ```typescript
 * import { Events } from './types';
 *
 * // Type-safe event handling
 * os.pullEvent<Events["mouse_click"]>("mouse_click").then(([button, x, y]) => {
 *     console.log(`Mouse clicked at (${x}, ${y}) with button ${button}`);
 * });
 * ```
 *
 * @example Working with peripherals
 * ```typescript
 * import { Side } from './types';
 *
 * function attachMonitor(side: Side) {
 *     const monitor = peripheral.wrap<Monitor>(side);
 *     monitor.clear();
 *     monitor.write("Hello World!");
 * }
 * ```
 */

/**
 * Represents valid sides for peripheral attachment in ComputerCraft
 *
 * @example
 * ```typescript
 * const monitor = peripheral.wrap<Monitor>("top" as Side);
 * ```
 */
export type Side =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "front"
    | "back"
    | (string & {});

/**
 * Valid mouse button numbers in ComputerCraft
 * - 1: Left click
 * - 2: Right click
 * - 3: Middle click
 */
export type MouseButton = 1 | 2 | 3;

/**
 * Represents a collection of transferred files from a file transfer event
 *
 * @example
 * ```typescript
 * os.pullEvent<Events["file_transfer"]>("file_transfer").then(([files]) => {
 *     const transferredFiles = files.getFiles();
 *     for (const file of transferredFiles) {
 *         console.log(`Received file: ${file.getName()}`);
 *     }
 * });
 * ```
 */
export type TransferredFiles = {
    getFiles: () => TransferredFile[];
};

/**
 * Represents a single transferred file with read capabilities and metadata
 */
export type TransferredFile = ReadFileHandle & {
    getName: () => string;
};

/**
 * Comprehensive mapping of all ComputerCraft events and their parameter types
 *
 * This interface provides type definitions for all built-in ComputerCraft events,
 * enabling type-safe event handling in TypeScript. Each event is documented with
 * its parameters and links to official ComputerCraft documentation.
 *
 * @example Using with os.pullEvent
 * ```typescript
 * async function handleMouseInput() {
 *     const [button, x, y] = await os.pullEvent<Events["mouse_click"]>("mouse_click");
 *     console.log(`Clicked at (${x}, ${y})`);
 * }
 * ```
 *
 * @example Type-safe event handling
 * ```typescript
 * function onRednetMessage([sender, message, protocol]: Events["rednet_message"]) {
 *     if (protocol === "myProtocol") {
 *         // Handle protocol-specific message
 *     }
 * }
 * ```
 */
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
        response: /** The successful WebSocket */ WebSocket
    ];
    [key: string & {}]: any[];
}
