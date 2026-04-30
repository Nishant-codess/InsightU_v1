/**
 * Stub sync service
 * SmartBoard sync feature is currently disabled
 */
import { Server } from 'socket.io';

/**
 * Set up SmartBoard IO (stub)
 */
export function setSmartBoardIO(_io: Server): void {
  // SmartBoard sync feature is currently disabled
  // TODO: Implement when whiteboard sync is needed
  console.log('[sync] SmartBoard IO stub: Socket sync disabled');
}