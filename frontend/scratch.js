import { createWorker } from 'tesseract.js';

async function run() {
  const worker = await createWorker('eng');
  const ret = await worker.recognize(
    'C:\\Users\\Asus\\.gemini\\antigravity-ide\\brain\\9e52c6ed-44fb-4650-8336-3dc71e1dbb37\\media__1780603941539.jpg',
    {},
    { blocks: true }
  );
  
  if (ret.data.blocks) {
    let wordCount = 0;
    ret.data.blocks.forEach(b => {
      b.paragraphs?.forEach(p => {
        p.lines?.forEach(l => {
          wordCount += l.words ? l.words.length : 0;
        });
      });
    });
    console.log("Words extracted successfully from blocks:", wordCount);
  } else {
    console.log("Blocks still null.");
  }
  await worker.terminate();
}
run().catch(console.error);
