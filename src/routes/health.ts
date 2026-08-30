import { Router } from 'express'
import { healthHandler } from '../healthHandler.js'

export const healthRouter = Router()

healthRouter.get('/', healthHandler)
