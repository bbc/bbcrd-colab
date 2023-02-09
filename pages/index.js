/* eslint-disable camelcase */
import { RoomProvider, useStorage } from '../liveblocks.config'
import { useRouter } from 'next/router'
import StartScreen from '../components/StartScreen'
import Cookies from 'cookies'
import { LiveList } from '@liveblocks/client'
import { unstable_batchedUpdates } from 'react-dom'

function Index () {
	const usernames = useStorage((root) => root.usernames)

	const router = useRouter()

	const handleSaveName = () => {
		router.replace('/lobby')
	}

	return <StartScreen handleSaveName={handleSaveName} usernames={usernames} />
}

export default function IndexPage () {
	return <RoomProvider unstable_batchedUpdates={unstable_batchedUpdates} initialPresence={{}} initialStorage={{ usernames: new LiveList() }} id='lobby'>
		<Index />
	</RoomProvider>
}

export const getServerSideProps = async ({ req, res }) => {
	const cookies = new Cookies(req, res)
	const username = cookies.get('username')

	if (username) {
		return {
			redirect: {
				destination: '/lobby',
				permanent: false
			}
		}
	}
	else {
		return {
			props: {}
		}
	}
}
