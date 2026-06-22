import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_wb6snu6s"],
});

console.log("DATA_SUFFIX:", DATA_SUFFIX);
