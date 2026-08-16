require('dotenv/config')
const express = require('express')
const cors = require('cors')
const authRouter = require('./routes/auth')
const profileRouter = require('./routes/profile')
const lookupsRouter = require('./routes/lookups')
const venuesRouter = require('./routes/venues')
const businessesRouter = require('./routes/businesses')
const usersRouter = require('./routes/users')
const connectionsRouter = require('./routes/connections')
const discoverRouter = require('./routes/discover')
const feedRouter = require('./routes/feed')
const postsRouter = require('./routes/posts')
const invitesRouter = require('./routes/invites')

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
app.use('/api', businessesRouter)
app.use('/api', usersRouter)
app.use('/api', connectionsRouter)
app.use('/api', discoverRouter)
app.use('/api', feedRouter)
app.use('/api', postsRouter)
app.use('/api', invitesRouter)

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`)
})
