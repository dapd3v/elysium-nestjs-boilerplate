import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService extends Logger {
  constructor(private configService: ConfigService) {
    super();
  }

  error(message: string, trace: string, context?: string) {
    // Log base
    super.error(message, trace, context);

    // Agregar timestamp
    const timestamp = new Date().toISOString();

    // Crear objeto de log estructurado
    const logData = {
      timestamp,
      level: 'error',
      context: context || 'Application',
      message,
      trace,
      environment: this.configService.get('NODE_ENV'),
    };

    // Envio a un servicio externo
    this.sendToExternalService(logData);
    
    // Guardar en archivo si es necesario
    this.saveToFile(logData);
  }

  log(message: string, context?: string) {
    // Log base
    super.log(message, context);

    const logData = {
      timestamp: new Date().toISOString(),
      level: 'info',
      context: context || 'Application',
      message,
      environment: this.configService.get('NODE_ENV'),
    };

    // Métricas o tracking adicional
    this.trackMetric(logData);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      context: context || 'Application',
      message,
      environment: this.configService.get('NODE_ENV'),
    };

    this.sendToExternalService(logData);
  }

  private sendToExternalService(logData: any) {
    // Implementacion de lógica para envio a servicios como:
    // - Sentry
    // - DataDog
    // - CloudWatch
    // - ELK Stack
    console.log('Sending to external service:', logData);
  }

  private saveToFile(logData: any) {
    // Implementacion de lógica para guardar en archivo si es necesario
    // Se puede usar Winston u otra librería
  }

  private trackMetric(logData: any) {
    // Implementacion de tracking de métricas
    // Por ejemplo, número de requests, tiempos de respuesta, etc.
  }
}