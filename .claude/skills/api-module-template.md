# NestJS Module Template Skill

Use this template when creating new NestJS modules for the TPL Expense API.

## Standard Module Structure

```
src/modules/{module-name}/
├── {module-name}.module.ts
├── {module-name}.controller.ts
├── {module-name}.service.ts
├── dto/
│   ├── create-{entity}.dto.ts
│   ├── update-{entity}.dto.ts
│   └── {entity}-response.dto.ts
└── entities/ (if not using Prisma models directly)
```

## Module Template

```typescript
// {module-name}.module.ts
import { Module } from '@nestjs/common';
import { {Name}Controller } from './{module-name}.controller';
import { {Name}Service } from './{module-name}.service';

@Module({
  controllers: [{Name}Controller],
  providers: [{Name}Service],
  exports: [{Name}Service],
})
export class {Name}Module {}
```

## Controller Template

```typescript
// {module-name}.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { {Name}Service } from './{module-name}.service';
import { Create{Entity}Dto } from './dto/create-{entity}.dto';
import { Update{Entity}Dto } from './dto/update-{entity}.dto';

@ApiTags('{Name}')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('{module-name}')
export class {Name}Controller {
  constructor(private readonly {name}Service: {Name}Service) {}

  @Post()
  @ApiOperation({ summary: 'Create {entity}' })
  create(@Body() createDto: Create{Entity}Dto) {
    return this.{name}Service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all {entities}' })
  findAll() {
    return this.{name}Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get {entity} by ID' })
  findOne(@Param('id') id: string) {
    return this.{name}Service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update {entity}' })
  update(@Param('id') id: string, @Body() updateDto: Update{Entity}Dto) {
    return this.{name}Service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete {entity}' })
  remove(@Param('id') id: string) {
    return this.{name}Service.remove(id);
  }
}
```

## Service Template

```typescript
// {module-name}.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Create{Entity}Dto } from './dto/create-{entity}.dto';
import { Update{Entity}Dto } from './dto/update-{entity}.dto';

@Injectable()
export class {Name}Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: Create{Entity}Dto) {
    return this.prisma.{entity}.create({
      data: createDto,
    });
  }

  async findAll() {
    return this.prisma.{entity}.findMany();
  }

  async findOne(id: string) {
    const {entity} = await this.prisma.{entity}.findUnique({
      where: { id },
    });
    if (!{entity}) {
      throw new NotFoundException('{Entity} not found');
    }
    return {entity};
  }

  async update(id: string, updateDto: Update{Entity}Dto) {
    await this.findOne(id);
    return this.prisma.{entity}.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.{entity}.delete({
      where: { id },
    });
  }
}
```

## DTO Templates

```typescript
// dto/create-{entity}.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create{Entity}Dto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

```typescript
// dto/update-{entity}.dto.ts
import { PartialType } from '@nestjs/swagger';
import { Create{Entity}Dto } from './create-{entity}.dto';

export class Update{Entity}Dto extends PartialType(Create{Entity}Dto) {}
```

## Key Decorators Reference

- `@UseGuards(JwtAuthGuard)` - Require authentication
- `@UseGuards(RolesGuard)` - Require specific roles
- `@Roles(RoleType.ADMIN)` - Specify allowed roles
- `@RequirePermissions('expense:create')` - Permission-based access
- `@CurrentUser()` - Get current user from request
