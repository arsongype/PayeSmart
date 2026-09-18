import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { ReportingService } from './reporting.service.js'

interface RequestWithUser extends Request {
  user: { sub: string; role: string }
}

@Controller('reporting')
@UseGuards(AuthGuard('jwt'))
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  getDashboard(@Req() request: RequestWithUser) {
    return this.reportingService.getDashboard(Number(request.user.sub), request.user.role)
  }

  @Get('export')
  async exportReport(
    @Query('format') format: string,
    @Req() request: RequestWithUser,
    @Res() response: Response,
  ) {
    const report = await this.reportingService.exportReport(Number(request.user.sub), request.user.role, format)
    response.set({
      'Content-Type': report.contentType,
      'Content-Disposition': `attachment; filename="${report.filename}"`,
    })
    response.send(report.content)
  }
}