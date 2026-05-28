import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public priceId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public successUrl: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public cancelUrl: string;
}

export class PortalDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public returnUrl: string;
}
