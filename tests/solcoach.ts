import * as anchor from '@coral-xyz/anchor'
import { assert } from 'chai'

describe('solcoach', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  it('initializes config and tip vault', async () => {
    // TODO: call initialize_config, check accounts created
    assert.ok(true)
  })

  it('registers a new user', async () => {
    // TODO: register with Moderate risk, check profile
    assert.ok(true)
  })

  it('creates and accepts a daily task', async () => {
    // TODO: crank creates task, user accepts, check streak
    assert.ok(true)
  })
})
