import Head from 'next/head'

export default function Favicon ({ step = 0 }) {
	return <Head>
		<link rel='icon' type='image/png' href={`/favicon/beacon-${step}.png`} key='favicon' />
		<link rel='mask-icon' href={`/favicon/beacon-${step}.svg`} key='favicon-safari' />
		<link rel='apple-touch-icon' href={`/favicon/beacon-${step}.png`} key='favicon-apple' />
		<meta name='theme-color' content='#FFFFFF' />
	</Head>
}
