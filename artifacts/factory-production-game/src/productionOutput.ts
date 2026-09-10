export type ProductionOutput = {
  key: string;
  amount: number;
};

export const primaryOutputFor = (recipeName: string, outputs: ProductionOutput[]) =>
  recipeName === 'advanced-oil-processing'
    ? outputs.find((output) => output.key === 'heavy-oil') ?? outputs[0]
    : recipeName === 'uranium-processing'
      ? outputs.find((output) => output.key === 'uranium-238') ?? outputs[0]
    : outputs[0];