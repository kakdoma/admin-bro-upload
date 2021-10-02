import {
  flat,
  RecordActionResponse,
  ActionRequest,
  ActionContext,
  UploadedFile,
  After,
} from 'adminjs'

import { buildRemotePath } from '../utils/build-remote-path'
import { BaseProvider } from '../providers'
import { UploadOptionsWithDefault } from '../types/upload-options.type'
import { getNamespaceFromContext } from './strip-payload-factory'

export const updateRecordFactory = (
  uploadOptionsWithDefault: UploadOptionsWithDefault,
  provider: BaseProvider,
): After<RecordActionResponse> => {
  const { properties, uploadPath, multiple } = uploadOptionsWithDefault

  const updateRecord = async (
    response: RecordActionResponse,
    request: ActionRequest,
    context: ActionContext,
  ): Promise<RecordActionResponse> => {
    const { record } = context

    const {
      [properties.file]: files,
      [properties.filesToDelete]: filesToDelete,
    } = getNamespaceFromContext(context)

    const { method } = request

    if (method !== 'post') {
      return response
    }

    if (record && record.isValid()) {
      if (multiple) {
        if (files && files.length) {
          const recordFiles = record.get(properties.file)
          const uploadedFiles = files.filter(
            (file, i) => !recordFiles || i >= recordFiles.length,
          ) as Array<UploadedFile>
          const keys = await Promise.all<string>(uploadedFiles
            .map(async (uploadedFile) => {
              const key = buildRemotePath(record, uploadedFile, uploadPath)
              await provider.upload(uploadedFile, key, context)
              return key
            }))
          let params = recordFiles ? recordFiles.reduce((acc, file, i) => flat.set(acc, `${properties.file}.${i}`, file), {}) : {}
          params = uploadedFiles.reduce((acc, file, i) => {
            const realIndex = i + (recordFiles ? Object.keys(recordFiles).length : 0)
            const value: Record<string, string | number | null> = { [properties.key]: keys[i] }
            if (properties.bucket) {
              value[properties.bucket] = provider.bucket
            }
            if (properties.size) {
              value[properties.size] = file.size
            }
            if (properties.mimeType) {
              value[properties.mimeType] = file.type
            }
            if (properties.filename) {
              value[properties.filename] = file.name
            }
            return flat.set(acc, `${properties.file}.${realIndex}`, value)
          }, params)

          await record.update(params)
        }

        if (
          filesToDelete
            && filesToDelete[properties.file]
            && filesToDelete[properties.file].length
        ) {
          const filesData = (filesToDelete[properties.file] as Array<string>).map((index) => ({
            key: record.get(properties.file)[index][properties.key] as string,
            bucket: properties.bucket
              ? record.get(properties.file)[index][properties.bucket]
              : undefined,
          }))
          await Promise.all(filesData.map(async (fileData) => (
            provider.delete(fileData.key, fileData.bucket || provider.bucket, context)
          )))

          const newFiles = record.get(properties.file).filter((el, i) => (
            !filesToDelete[properties.file].includes(i.toString())
          ))

          const newParams = flat.set({}, properties.file, newFiles)
          await record.update(newParams)
        }

        return {
          ...response,
          record: record.toJSON(context.currentAdmin),
        }
      }

      if (!multiple && files && files.length) {
        const uploadedFile: UploadedFile = files[0]

        const oldRecordParams = { ...record.params }
        const key = buildRemotePath(record, uploadedFile, uploadPath)

        await provider.upload(uploadedFile, key, context)

        const params = {
          [properties.key]: key,
          ...properties.bucket && { [properties.bucket]: provider.bucket },
          ...properties.size && { [properties.size]: uploadedFile.size?.toString() },
          ...properties.mimeType && { [properties.mimeType]: uploadedFile.type },
          ...properties.filename && { [properties.filename]: uploadedFile.name as string },
        }

        await record.update(params)

        const oldKey = oldRecordParams[properties.key] && oldRecordParams[properties.key]
        const oldBucket = (
          properties.bucket && oldRecordParams[properties.bucket]
        ) || provider.bucket

        if (oldKey && oldBucket && (oldKey !== key || oldBucket !== provider.bucket)) {
          await provider.delete(oldKey, oldBucket, context)
        }

        return {
          ...response,
          record: record.toJSON(context.currentAdmin),
        }
      }

      // someone wants to remove one file
      if (!multiple && files === null) {
        const bucket = (properties.bucket && record.get(properties.bucket)) || provider.bucket
        const key = record.get(properties.key) as string | undefined

        // and file exists
        if (key && bucket) {
          const params = {
            [properties.file]: null,
          }

          await record.update(params)
          await provider.delete(key, bucket, context)

          return {
            ...response,
            record: record.toJSON(context.currentAdmin),
          }
        }
      }
    }

    return response
  }

  return updateRecord
}
