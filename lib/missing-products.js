const definitions = require('../assets/definitions');
const { allProducts } = require('./shared');

const appCodes = definitions.map((x) => x.jetbrainsCode);

async function main() {
  const foo = await allProducts();

  const macProducts = foo.filter((x) => Boolean(x.distributions && x.distributions.mac));

  const notKnown = macProducts.filter((x) => !appCodes.includes(x.code));
  console.log(notKnown.map((x) => [x.code, x.name]));
}

main().catch((e) => {
  console.warn(e);
  process.exit(1);
});
