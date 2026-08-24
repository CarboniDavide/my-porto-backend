declare module 'nodemailer' {
  type SendMailOptions = {
    from?: string
    to?: string
    replyTo?: string
    subject?: string
    text?: string
    html?: string
  }

  type Transporter = {
    sendMail(options: SendMailOptions): Promise<unknown>
  }

  function createTransport(config: {
    service?: string
    auth?: {
      user?: string
      pass?: string
    }
  }): Transporter

  export { createTransport }
}
