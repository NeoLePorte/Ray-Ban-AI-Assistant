const mockEmbed = jest.fn().mockImplementation((sentences) => {
    return {
      array: () => Promise.resolve(sentences.map(() => new Array(512).fill(0))),
      dispose: jest.fn(),
    };
  });
  
  const mockLoad = jest.fn().mockResolvedValue({ embed: mockEmbed });
  
  export { mockLoad as load };