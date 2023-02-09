module.exports = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx}',
		'./components/**/*.{js,ts,jsx,tsx}',
		'./utils.js'
	],
	safelist: [{
		pattern: /(bg|text)-(red|sky|lime|amber|pink|indigo|teal|orange)-(100|200|300|400|500|600|700)/,
		variants: ['hover']
	}, {
		pattern: /border-(red|sky|lime|amber|pink|indigo|teal|orange)-(200|300|400|700)/,
		variants: ['focus', 'hover']
	}, {
		pattern: /(ring|ring-offset)-(red|sky|lime|amber|pink|indigo|teal|orange)-(300|400|500|600|700)/
	}],
	theme: {
		extend: {
			fontFamily: {
				sans: ['IBM Plex Sans', 'sans-serif']
			},
			gridTemplateRows: {
				9: 'repeat(9, minmax(0, 1fr))',
				10: 'repeat(10, minmax(0, 1fr))'
			},
			gridRowStart: {
				8: '8',
				9: '9',
				10: '10'
			},
			gridRowEnd: {
				8: '8',
				9: '9',
				10: '10'
			},
			gridColStart: {
				8: '8',
				9: '9',
				10: '10'
			},
			gridColEnd: {
				8: '8',
				9: '9',
				10: '10'
			},
			backdropBlur: {
				px: '1px',
				xs: '2px'
			},
			keyframes: {
				'bounce-up': {
					'0%, 100%': {
						'transform': 'translateY(-25%)',
						'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)'
					},
					'50%': {
						'transform': 'translateY(0)',
						'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)'
					}
				},
				'bounce-down': {
					'0%, 100%': {
						'transform': 'translateY(25%)',
						'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)'
					},
					'50%': {
						'transform': 'translateY(0)',
						'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)'
					}
				},
				'bounce-left': {
					'0%, 100%': {
						'transform': 'translateX(-25%)',
						'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)'
					},
					'50%': {
						'transform': 'translateX(0)',
						'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)'
					}
				},
				'bounce-right': {
					'0%, 100%': {
						'transform': 'translateX(25%)',
						'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)'
					},
					'50%': {
						'transform': 'translateX(0)',
						'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)'
					}
				},
				'shake': {
					'0%, 100%': {
						'transform': 'translateX(5px)',
						'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)'
					},
					'50%': {
						'transform': 'translateX(-5px)',
						'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)'
					}
				}
			},
			animation: {
				'bounce-up': 'bounce-up 1s infinite',
				'bounce-down': 'bounce-down 1s infinite',
				'bounce-left': 'bounce-left 1s infinite',
				'bounce-right': 'bounce-right 1s infinite',
				'shake': 'shake 1s infinite'
			}
		}
	},
	plugins: []
}
