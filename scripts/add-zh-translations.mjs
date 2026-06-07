import { readFileSync, writeFileSync } from 'fs'

const filePath = 'c:/laragon/www/travel/frontend/public/locales/zh.ts'
const content = readFileSync(filePath, 'utf8')
const NL = content.includes('\r\n') ? '\r\n' : '\n'

const registryStart = content.indexOf(`    registry: {${NL}      ...en.categoryPage.registry,`)
if (registryStart === -1) { console.error('Start not found'); process.exit(1) }

const marker = `${NL}    },${NL}    verticalLabels:`
const registryEnd = content.indexOf(marker, registryStart)
if (registryEnd === -1) { console.error('End not found'); process.exit(1) }

const newRegistry = `    registry: {
      ...en.categoryPage.registry,
      'arac-kiralama': {
        name: '\u79df\u8f66',
        namePlural: '\u79df\u8f66',
        heroHeading: '\u79df\u8f66',
        heroSubheading: '\u4ece\u7ecf\u6d4e\u578b\u5230\u8c6a\u534e\u578b\uff0c\u6570\u767e\u6b3e\u8f66\u578b\u3002\u7075\u6d3b\u7684\u53d6\u8fd8\u8f66\u5730\u70b9\u3002',
        priceUnit: '/\u5929',
      },
      oteller: {
        name: '\u9152\u5e97',
        namePlural: '\u9152\u5e97',
        heroHeading: '\u68a6\u60f3<br />\u9152\u5e97',
        heroSubheading: '\u5728\u571f\u8033\u5176\u6700\u512a\u8d28\u7684\u9152\u5e97\u4e2d\u4eab\u53d7\u8212\u9002\u4f4f\u5bbf\u3002',
        priceUnit: '/\u665a',
      },
      'tatil-evleri': {
        name: '\u5ea6\u5047\u5c4b',
        namePlural: '\u5ea6\u5047\u5c4b',
        heroHeading: '\u5ea6\u5047<br />\u5c4b\u6240',
        heroSubheading: '\u548c\u5bb6\u4eba\u6216\u670b\u53cb\u5728\u79c1\u4eba\u522b\u5885\u548c\u5ea6\u5047\u5c4b\u4e2d\u521b\u9020\u96be\u5fd8\u7684\u56de\u5fc6\u3002',
        priceUnit: '/\u665a',
      },
      'yat-kiralama': {
        name: '\u6e38\u8247\u79df\u8d41',
        namePlural: '\u6e38\u8247',
        heroHeading: '\u6d77\u4e0a<br />\u81ea\u7531\u884c',
        heroSubheading: '\u4e58\u5750\u4f20\u7edf\u5e06\u8239\u3001\u53cc\u5e06\u8239\u548c\u673a\u52a8\u6e38\u8247\u63a2\u7d22\u571f\u8033\u5176\u78a7\u7eff\u6d77\u6e7e\u3002',
        priceUnit: '/\u665a',
      },
      turlar: {
        name: '\u65c5\u6e38\u7ebf\u8def',
        namePlural: '\u65c5\u6e38\u7ebf\u8def',
        heroHeading: '\u51c6\u5907\u597d<br />\u51fa\u53d1\uff1f',
        heroSubheading: '\u901a\u8fc7\u5bfc\u6e38\u548c\u79c1\u4eba\u65c5\u6e38\u9009\u9879\u53d1\u73b0\u571f\u8033\u5176\u7684\u5386\u53f2\u548c\u81ea\u7136\u7f8e\u666f\u3002',
        priceUnit: '/\u4eba',
      },
      aktiviteler: {
        name: '\u6d3b\u52a8\u4f53\u9a8c',
        namePlural: '\u6d3b\u52a8',
        heroHeading: '\u7cbe\u5f69<br />\u4f53\u9a8c\u6d3b\u52a8',
        heroSubheading: '\u6f5c\u6c34\u3001\u6ed1\u7fd4\u4f1e\u3001\u6f02\u6d41\u7b49\u66f4\u591a\u6d3b\u52a8\u2014\u5192\u9669\u5c31\u5728\u524d\u65b9\uff01',
        priceUnit: '/\u4eba',
      },
      kruvaziyer: {
        name: '\u90ae\u8f6e',
        namePlural: '\u90ae\u8f6e',
        heroHeading: '\u90ae\u8f6e<br />\u5047\u671f',
        heroSubheading: '\u4e58\u5750\u58ee\u89c2\u7684\u90ae\u8f6e\u63a2\u7d22\u5730\u4e2d\u6d77\u3001\u7231\u743c\u6d77\u548c\u9ed1\u6d77\u7684\u7470\u5b9d\u3002',
        priceUnit: '/\u4eba',
      },
      'hac-umre': {
        name: '\u671d\u89d2\u4e0e\u526f\u671d',
        namePlural: '\u671d\u89d2\u5957\u9910',
        heroHeading: '\u671d\u89d2\u4e0e\u526f\u671d<br />\u5957\u9910',
        heroSubheading: '\u4e3a\u524d\u5f80\u5723\u5730\u7684\u5b89\u5168\u8212\u9002\u4e4b\u65c5\u63d0\u4f9b\u5168\u9762\u5957\u9910\u3002',
        priceUnit: '/\u4eba',
      },
      vize: {
        name: '\u7b7e\u8bc1\u670d\u52a1',
        namePlural: '\u7b7e\u8bc1',
        heroHeading: '\u7b7e\u8bc1<br />\u670d\u52a1',
        heroSubheading: '180\u591a\u4e2a\u56fd\u5bb6\u7684\u5feb\u901f\u5b89\u5168\u7b7e\u8bc1\u7533\u8bf7\u3002\u5728\u7ebf\u529e\u7406\u6216\u6709\u987e\u95ee\u652f\u6301\u3002',
        priceUnit: '/\u4eba',
      },
      'ucak-bileti': {
        name: '\u673a\u7968',
        namePlural: '\u673a\u7968',
        heroHeading: '\u6700\u4f18\u60e0<br />\u673a\u7968',
        heroSubheading: '\u6bd4\u8f83\u6570\u767e\u5bb6\u822a\u7a7a\u516c\u53f8\u7684\u4ef7\u683c\uff0c\u627e\u5230\u6700\u5c9e\u5b9e\u7684\u7968\u4ef7\u3002',
        priceUnit: '/\u5f20',
      },
      feribot: {
        name: '\u6e21\u8f6e',
        namePlural: '\u6e21\u8f6e\u8096',
        heroHeading: '\u6e21\u8f6e<br />\u8096',
        heroSubheading: '\u9884\u8ba2\u571f\u8033\u5176\u3001\u5e0c\u814a\u548c\u585e\u6d66\u8def\u7ebf\u7684\u6e21\u8f6e\u8096\u3002',
        priceUnit: '/\u4eba',
      },
      transfer: {
        name: '\u63a5\u9001\u670d\u52a1',
        namePlural: '\u63a5\u9001',
        heroHeading: '\u79c1\u4eba<br />\u63a5\u9001',
        heroSubheading: '\u673a\u573a\u3001\u9152\u5e97\u548c\u666f\u70b9\u63a5\u9001\u670d\u52a1\u3002\u4e58\u5750VIP\u8f66\u8f86\u5b89\u5168\u51fa\u884c\u3002',
        priceUnit: '/\u8f66',
      },
      'plaj-sezlong': {
        name: '\u6d77\u6ee9\u8eba\u6905',
        namePlural: '\u6d77\u6ee9\u9884\u8ba2',
        heroHeading: '\u6d77\u6ee9<br />\u8eba\u6905\u9884\u8ba2',
        heroSubheading: '\u5728\u70ed\u95e8\u6d77\u6ee9\u9884\u8ba2\u8eba\u6905\u548c\u9057\u9633\u4f1e\uff0c\u4eab\u53d7\u5b8c\u7f8e\u6d77\u8fb9\u65f6\u5149\u3002',
        priceUnit: '/\u4eba',
      },
      'sinema-biletleri': {
        name: '\u7535\u5f71\u7968',
        namePlural: '\u7535\u5f71\u7968',
        heroHeading: '\u7535\u5f71<br />\u7968',
        heroSubheading: '\u65b0\u7247\u3001\u7279\u522b\u653e\u6620\u548c\u573a\u6b21\u7684\u5728\u7ebf\u8d2d\u7968\u9009\u9879\u3002',
        priceUnit: '/\u5f20',
      },
      etkinlikler: {
        name: '\u6f14\u51fa\u6d3b\u52a8',
        namePlural: '\u6d3b\u52a8',
        heroHeading: '\u97f3\u4e50\u4f1a\u3001\u8282\u5e86<br />\u53ca\u66f4\u591a',
        heroSubheading: '\u97f3\u4e50\u4f1a\u3001\u5267\u9662\u3001\u8282\u5e86\u548c\u6587\u5316\u6d3b\u52a8\u7684\u53ef\u9760\u8d2d\u7968\u4e0e\u6ce8\u518c\u3002',
        priceUnit: '/\u5f20',
      },
      'restoran-rezervasyon': {
        name: '\u9910\u5385\u9884\u8ba2',
        namePlural: '\u9910\u5385',
        heroHeading: '\u60a8\u7684\u9910\u684c<br />\u5df2\u51c6\u5907\u597d',
        heroSubheading: '\u5728\u7cbe\u9009\u9910\u5385\u4e2d\u9009\u62e9\u65e5\u671f\u548c\u65f6\u95f4\u9884\u8ba2\u6b3e\u5c71\u3002',
        priceUnit: '/\u4eba',
      },
    },
    verticalLabels:`
    .replace(/\n/g, NL)

const newContent = content.substring(0, registryStart) + newRegistry + content.substring(registryEnd + marker.length)
writeFileSync(filePath, newContent, 'utf8')
console.log('Done: zh.ts updated, new length:', newContent.length)
