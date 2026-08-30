import { Router } from 'express'
import { uploadRecruitFileHandler } from '../recruitFileUploadHandler.js'

export const recruitFileUploadRouter = Router()

recruitFileUploadRouter.post('/', uploadRecruitFileHandler)
