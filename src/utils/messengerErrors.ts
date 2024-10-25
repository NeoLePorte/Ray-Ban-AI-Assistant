import { AppError } from './errorHandler';

export class MessengerError extends AppError {
    constructor(message: string, statusCode: number, public messengerCode: string) {
        super(message, statusCode);
    }
}

export function handleMessengerError(error: any): MessengerError {
    if (error.response && error.response.data && error.response.data.error) {
        const { message, code } = error.response.data.error;
        let statusCode = error.response.status;

        switch (code) {
            case 10:
                return new MessengerError('Permission denied', 403, code);
            case 100:
                return new MessengerError('Invalid parameter', 400, code);
            case 190:
                return new MessengerError('Access token has expired', 401, code);
            default:
                return new MessengerError(message || 'Unknown Messenger error', statusCode, code);
        }
    }

    return new MessengerError('Unknown error', 500, 'UNKNOWN');
}
