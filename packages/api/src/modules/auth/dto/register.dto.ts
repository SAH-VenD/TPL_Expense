import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@tekcellent.com',
    description: 'Email address (must be @tekcellent.com)',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars, must include uppercase, lowercase, number, special char)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;
}
