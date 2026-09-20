import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JsonLoggerService } from './observability/json-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLoggerService(),
  });
  
  // Enable global validation for DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Enable CORS for Frontend UI
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  const logger = new JsonLoggerService();
  logger.log(`Transaction API running on: http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
