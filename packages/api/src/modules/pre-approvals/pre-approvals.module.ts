import { Module } from '@nestjs/common';
import { PreApprovalsController } from './pre-approvals.controller';
import { PreApprovalsService } from './pre-approvals.service';

@Module({
  controllers: [PreApprovalsController],
  providers: [PreApprovalsService],
  exports: [PreApprovalsService],
})
export class PreApprovalsModule {}
