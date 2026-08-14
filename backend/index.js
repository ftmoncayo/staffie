require('dotenv/config')
const express = require('express')
const cors = require('cors')
const authRouter = require('./routes/auth')
const profileRouter = require('./routes/profile')
const lookupsRouter = require('./routes/lookups')
const venuesRouter = require('./routes/venues')

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api', lookupsRouter)
app.use('/api', venuesRouter)

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`)
})
