import { Controller, Post, UploadedFile, UseInterceptors} from "@nestjs/common";
import { UploadsService } from "./uploads.service.js";
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('uploads')

export class UploadsController {
  constructor(private readonly uploadService:UploadsService) {}


  @Post()
  @UseInterceptors(FileInterceptor('file'))

  UploadId(@UploadedFile() file: Express.Multer.File){
    return this.uploadService.saveFile(file);
  }
  
}