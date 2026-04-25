import { pusherServer } from './pusher';

export const emitQueueUpdate = async () => {
  try {
    await pusherServer.trigger('filamed-channel', 'queue_updated', {});
  } catch (error) {
    console.error('Pusher trigger error (queue_updated):', error);
  }
};

export const emitPatientCalled = async (data: { patientName: string; room: string; priority: string }) => {
  try {
    await pusherServer.trigger('filamed-channel', 'patient_called', data);
  } catch (error) {
    console.error('Pusher trigger error (patient_called):', error);
  }
};

export const getIO = () => {
  // Return a mock or handle appropriately if needed. 
  // Since we are moving to Pusher, this shouldn't be used for emitting anymore.
  return null;
};
