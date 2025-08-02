export class LoggerService {
    static info(message: string, data?: any) {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || '');
    }

    static warn(message: string, data?: any) {
        console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || '');
    }

    static error(message: string, data?: any) {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, data || '');
    }
} 