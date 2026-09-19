import { diskStorage } from 'multer'
import { extname } from 'path'
import type { Request } from 'express'

export const storage = diskStorage({
  destination: './uploads',
  filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const filename = `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`
    callback(null, filename)
  },
})

export const fileFilter = (req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true)
  } else {
    callback(new Error('Type de fichier non autorisé'), false)
  }
}
