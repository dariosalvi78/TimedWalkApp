export const emailSender = {
  async sendEmail (to, subject, text) {
    // For testing purposes, we will just log the email instead of sending it.
    console.info(`Sending email to ${to} with subject "${subject}" and text: ${text}`)
    return true
  }
}
