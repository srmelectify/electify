import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Email address or student registration number",
    example: "admin@electify.edu",
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({
    description: "User password",
    example: "Admin@12345",
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}

