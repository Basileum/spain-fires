import { createLogger, format, transports } from 'winston';

// Custom format for better readability
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack, file, function: func }) => {
    let logMessage = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (file) {
      logMessage += ` [${file}]`;
    }
    
    if (func) {
      logMessage += ` [${func}]`;
    }
    
    logMessage += `: ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Create the logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      )
    }),
    // File transport for all logs
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for error logs only
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Helper function to create a logger with file context
export function createFileLogger(filename: string) {
  return {
    info: (message: string, func?: string, meta?: any) => {
      logger.info(message, { file: filename, function: func, ...meta });
    },
    error: (message: string, func?: string, error?: Error, meta?: any) => {
      logger.error(message, { file: filename, function: func, stack: error?.stack, ...meta });
    },
    warn: (message: string, func?: string, meta?: any) => {
      logger.warn(message, { file: filename, function: func, ...meta });
    },
    debug: (message: string, func?: string, meta?: any) => {
      logger.debug(message, { file: filename, function: func, ...meta });
    },
    verbose: (message: string, func?: string, meta?: any) => {
      logger.verbose(message, { file: filename, function: func, ...meta });
    }
  };
}

// Default logger for general use
export default logger;
