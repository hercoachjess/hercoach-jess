import DietForm from './DietForm'

export const metadata = {
  title: 'Your food week · hercoach Jess',
  description: "A short weekly food tracker Jess uses to help support you. No judgement, just what you actually had.",
}

interface Props {
  searchParams: Promise<{ email?: string }>
}

export default async function DietPage({ searchParams }: Props) {
  const params = await searchParams
  return <DietForm initialEmail={params.email ?? ''} />
}
