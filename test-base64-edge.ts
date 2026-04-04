const image = "test";
const url = image.startsWith('data:image/') ? image : `data:image/jpeg;base64,${image}`;
console.log(url);
