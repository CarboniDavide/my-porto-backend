import { Router } from 'express'
import { contactHandler } from '../contactHandler.js'

export const contactRouter = Router()

contactRouter.post('/', (req, res) => { void contactHandler(req, res) })
