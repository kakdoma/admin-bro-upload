import { RecordJSON, ActionContext, flat } from 'adminjs'
import { BaseProvider } from '../providers'
import { UploadOptionsWithDefault } from '../types/upload-options.type'

export const fillRecordWithPath = async (
  record: RecordJSON,
  context: ActionContext,
  uploadOptionsWithDefault: UploadOptionsWithDefault,
  provider: BaseProvider,
): Promise<RecordJSON> => {
  const { properties, multiple } = uploadOptionsWithDefault

  if (multiple) {
    let resultFiles: any[]
    const files = flat.get(record?.params, properties.file)

    if (files && files.length) {
      resultFiles = await Promise.all(files.map(async (file) => {
        const path = await provider.path(
          file[properties.key],
          properties.bucket ? file[properties.bucket] : provider.bucket, context,
        )
        return {
          ...file,
          [properties.filePath]: path,
        }
      }))

      return {
        ...record,
        params: flat.set(record.params, properties.file, resultFiles),
      }
    }
  } else {
    let filePath: string | undefined
    const key = flat.get(record?.params, properties.key)
    const storedBucket = properties.bucket && flat.get(record?.params, properties.bucket)

    if (key) {
      filePath = await provider.path(
        key, storedBucket ?? provider.bucket, context,
      )
    }

    return {
      ...record,
      params: flat.set(record.params, properties.filePath, filePath),
    }
  }

  return record
}
