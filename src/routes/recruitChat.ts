import { Router } from 'express'
import { recruitChatHandler } from '../recruitChatHandler.js'

export const recruitChatRouter = Router()

recruitChatRouter.post('/', (req, res) => { void recruitChatHandler(req, res) })
