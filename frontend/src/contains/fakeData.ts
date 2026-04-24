export const avatarImgs = [
	'https://randomuser.me/api/portraits/men/32.jpg',
	'https://randomuser.me/api/portraits/women/44.jpg',
	'https://randomuser.me/api/portraits/men/46.jpg',
	'https://randomuser.me/api/portraits/men/97.jpg',
	'https://uifaces.co/our-content/donated/1H_7AxP0.jpg',
	'https://randomuser.me/api/portraits/women/9.jpg',
	'https://images-na.ssl-images-amazon.com/images/M/MV5BYzg2NDY4MjAtZDBjNS00MGRhLWJkZDMtYWJkZDM1NWZiMzgyXkEyXkFqcGdeQXVyMTE1MzA3MTI@._V1_UX172_CR0,0,172,256_AL_.jpg',
	'https://uifaces.co/our-content/donated/VUMBKh1U.jpg',
]

const personNames = [
	'Kailey Greer',
	'Karli Costa',
	'Camren Barnes',
	'Belinda Ritter',
	'Jameson Dickerson',
	'Giada Mann',
	'Evie Osborn',
	'Juliet Mcpherson',
	'Charlize Raymond',
	'Amaris Pittman',
	'Arnav Morris',
	'Malakai Casey',
	'Nevaeh Henry',
	'Mireya Roman',
	'Anthony Wyatt',
	'Mike Orr',
	'Azul Hull',
	'Derick Hubbard',
]

const tagNames = [
	'Life',
	'Travel',
	'Music',
	'Beauty',
	'Beach',
	'Hotdog',
	'Car',
	'Bike',
	'Wordpress',
	'Php',
	'Javascript',
	'Vue',
	'Reactjs',
	'Androind',
]

const featuredImgs = [
	'/uploads/external/5b83202fc8e75b1af954.avif',
	'/uploads/external/5594aea620911dfd0e24.avif',
	'/uploads/external/69ad1f7fc65dbd7e243b.avif',
	'/uploads/external/1361546f0f30d5c97564.avif',
	'/uploads/external/97adbe2922720f83d690.avif',
	'/uploads/external/5e1f6ea3c51486a6c5d0.avif',
	'/uploads/external/bed4ae28cda4eb2c8e9a.avif',
	'/uploads/external/bf9a31dfa5035a3d1440.avif',
	'/uploads/external/45c03617b183f7b09415.avif',
	'/uploads/external/e48930347a74912defa5.avif',
	'/uploads/external/c1d049cd977773eb3246.avif',
	'/uploads/external/ebad3f3432e6b297a5c5.avif',
	'/uploads/external/ee72581777576e9174d0.avif',
	'/uploads/external/d6d9145d15c0a267d2c2.avif',
	'/uploads/external/19429427660aff839840.avif',
]

const imgHigtQualitys = [
	'/uploads/external/7dfe5672c30dac147167.avif',
	'/uploads/external/0e11222f0f61e1c47e18.avif',
	'/uploads/external/9619d951ab97f23ce5d7.avif',
	'/uploads/external/a99ecd963c433a3ad718.avif',
	'/uploads/external/8158d990c6db11cdecb8.avif',
	'/uploads/external/5274b08d7d6bfb29c2c3.avif',
	'/uploads/external/4eee192ddcb4a4d6cadf.avif',
	'/uploads/external/dd8f2afb26fc74b4fbd3.avif',
	'/uploads/external/9024b1597ffa45510e4f.avif',
]

const aTitles = [
	'adipiscing bibendum est ultricies integer quis auctor elit sed vulputate',
	'in arcu cursus euismod quis viverra nibh cras pulvinar mattis',
	'natoque penatibus et magnis dis parturient montes nascetur ridiculus mus',
	'et leo duis ut diam quam nulla porttitor massa id',
	'turpis cursus in hac habitasse platea dictumst quisque sagittis purus',
	'ut faucibus pulvinar elementum integer enim neque volutpat ac tincidunt',
	'interdum velit euismod in pellentesque massa placerat duis ultricies lacus',
	'fringilla ut morbi tincidunt augue interdum velit euismod in pellentesque',
	'sagittis vitae et leo duis ut diam quam nulla porttitor',
	'in mollis nunc sed id semper risus in hendrerit gravida',
	'tellus integer feugiat scelerisque varius morbi enim nunc faucibus a',
	'eleifend mi in nulla posuere sollicitudin aliquam ultrices sagittis orci',
	'non sodales neque sodales ut etiam sit amet nisl purus',
]

function _getTitleRd() {
	return aTitles[Math.floor(Math.random() * aTitles.length)]
}
function _getPersonNameRd() {
	return personNames[Math.floor(Math.random() * personNames.length)]
}

function _getImgRd() {
	return featuredImgs[Math.floor(Math.random() * featuredImgs.length)]
}

function _getImgHightQualityRd() {
	return imgHigtQualitys[Math.floor(Math.random() * imgHigtQualitys.length)]
}

function _getTagNameRd() {
	return tagNames[Math.floor(Math.random() * tagNames.length)]
}
function _getAvatarRd() {
	return avatarImgs[Math.floor(Math.random() * avatarImgs.length)]
}

export {
	_getImgRd,
	_getTagNameRd,
	_getAvatarRd,
	_getImgHightQualityRd,
	_getTitleRd,
	_getPersonNameRd,
}
