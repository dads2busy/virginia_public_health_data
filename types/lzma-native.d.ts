declare module 'lzma-native' {
  function decompress(
    data: Buffer,
    options: unknown,
    callback: (result: Buffer | string, error?: Error) => void
  ): void
}
