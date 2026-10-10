/**
 * UPI Simulator (UC-SAFE-01, Stage S1): link account, set PIN, pay by QR, the collect-request scam,
 * the "scan to receive" trick, refunds, and a three-question check.
 * Owner: P5
 *
 *   UpiSimulator  the full game; the runtime mounts it and gets a MiniGameResult back
 *   logic/flow    the chapter state machine
 *   logic/variants  seeded names, items and amounts
 */
export { UpiSimulator, type UpiSimulatorProps } from './UpiSimulator';
