import { Router } from 'express'
import { chatHandler } from '../chatHandler.js'

export const chatRouter = Router()

chatRouter.post('/', (req, res) => { void chatHandler(req, res) })
