import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '@/sanity/client'

export const runtime = 'edge';

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({
    token: process.env.SANITY_API_READ_TOKEN,
  }),
})
