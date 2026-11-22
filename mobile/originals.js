/* Exact archived grammar scans: static Metro requires enable offline bundling.
 * Canonical sources remain in /assets/pages; no generated replacements.
 */
const PAGES={
  'GRAMMAR-01':require('../assets/pages/GRAMMAR-01.webp'),
  'GRAMMAR-02':require('../assets/pages/GRAMMAR-02.webp'),
  'GRAMMAR-03':require('../assets/pages/GRAMMAR-03.webp'),
  'GRAMMAR-04':require('../assets/pages/GRAMMAR-04.webp'),
  'GRAMMAR-05':require('../assets/pages/GRAMMAR-05.webp'),
  'GRAMMAR-06':require('../assets/pages/GRAMMAR-06.webp'),
  'GRAMMAR-07':require('../assets/pages/GRAMMAR-07.webp'),
  'GRAMMAR-08':require('../assets/pages/GRAMMAR-08.webp'),
  'GRAMMAR-09':require('../assets/pages/GRAMMAR-09.webp'),
  'GRAMMAR-10':require('../assets/pages/GRAMMAR-10.webp'),
  'GRAMMAR-11':require('../assets/pages/GRAMMAR-11.webp'),
  'GRAMMAR-12':require('../assets/pages/GRAMMAR-12.webp'),
  'GRAMMAR-13':require('../assets/pages/GRAMMAR-13.webp'),
  'GRAMMAR-14':require('../assets/pages/GRAMMAR-14.webp'),
  'GRAMMAR-15':require('../assets/pages/GRAMMAR-15.webp'),
  'GRAMMAR-16':require('../assets/pages/GRAMMAR-16.webp')
};
const IDS=Object.freeze(Object.keys(PAGES));
function getOriginal(id){return Object.prototype.hasOwnProperty.call(PAGES,id)?PAGES[id]:null;}
function referencesForLesson(lesson){
 return (Array.isArray(lesson?.originalMaterials)?lesson.originalMaterials:[])
   .filter(ref=>typeof ref==='string' && Object.prototype.hasOwnProperty.call(PAGES,ref));
}
module.exports={PAGES,IDS,getOriginal,referencesForLesson};
