import Meyda from 'meyda'
import { useState, useEffect } from 'react'

const TALKING_THRESHOLD = 0.1
const PEAKED_TIME = 3000

const getMedia = async () => {
	try {
		return await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false
		})
	}
	catch (err) {
		console.log('Error:', err)
	}
}

const useMeydaAnalyser = () => {
	const [analyser, setAnalyser] = useState(null)
	const [running, setRunning] = useState(false)
	const [hasStarted, setStarted] = useState(false)
	const [hasPeaked, setPeaked] = useState(false)

	useEffect(() => {
		if (!hasStarted && running) {
			setStarted(true)
		}

		if (hasStarted) {
			const audioContext = new AudioContext()

			let newAnalyser

			getMedia().then((stream) => {
				if (audioContext.state === 'closed') {
					return
				}

				const source = audioContext.createMediaStreamSource(stream)

				newAnalyser = Meyda.createMeydaAnalyzer({
					audioContext,
					source,
					bufferSize: 1024,
					featureExtractors: ['rms'],
					callback: (features) => {
						if (features.rms > TALKING_THRESHOLD) {
							setPeaked(true)
						}
					}
				})

				setAnalyser(newAnalyser)
			})

			return () => {
				if (newAnalyser) {
					newAnalyser.stop()
				}

				if (audioContext) {
					audioContext.close()
				}
			}
		}
	}, [hasStarted, running])

	useEffect(() => {
		if (analyser) {
			if (running) {
				analyser.start()
			}
			else {
				analyser.stop()
			}
		}
	}, [running, analyser])

	useEffect(() => {
		if (hasPeaked) {
			const ref = setTimeout(() => {
				setPeaked(false)
			}, PEAKED_TIME)

			return () => {
				clearTimeout(ref)
			}
		}
	}, [hasPeaked])

	return {
		running,
		setRunning,
		hasPeaked
	}
}

export default useMeydaAnalyser
