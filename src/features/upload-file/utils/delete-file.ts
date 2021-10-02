import { BaseRecord, ActionContext } from 'adminjs'

import { BaseProvider } from '../providers'
import { UploadOptionsWithDefault } from '../types/upload-options.type'

export const deleteFile = async (
  options: UploadOptionsWithDefault,
  provider: BaseProvider,
  context: ActionContext,
  record?: BaseRecord,
): Promise<void> => {
  const { properties, multiple } = options

  if (record && !multiple) {
    const key = record?.get(properties.key)
    if (key) {
      const storedBucket = properties.bucket && record.get(properties.bucket) as string
      await provider.delete(key as string, storedBucket || provider.bucket, context)
    }
  } else if (record && multiple) {
    const files = record?.get(properties.file)
    if (files && files.length) {
      await Promise.all((files).map(async (file) => (
        provider.delete(file[properties.key],
          properties.bucket ? file[properties.bucket] : provider.bucket, context)
      )))
    }
  }
}
