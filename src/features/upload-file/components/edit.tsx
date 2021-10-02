import React, { FC, useState, useEffect } from 'react'
import { EditPropertyProps, flat } from 'adminjs'
import { DropZone, FormGroup, Label, DropZoneItem, FormMessage } from '@adminjs/design-system'
import PropertyCustom from '../types/property-custom.type'

const Edit: FC<EditPropertyProps> = ({ property, record, onChange }) => {
  const { params } = record
  const { custom } = property as unknown as { custom: PropertyCustom }
  const error = record.errors && record.errors[property.propertyPath]

  if (!custom.multiple) {
    const path = flat.get(params, custom.filePathProperty)
    const key = flat.get(params, custom.keyProperty)
    const file = flat.get(params, custom.fileProperty)

    const [originalKey, setOriginalKey] = useState(key)
    const [filesToUpload, setFilesToUpload] = useState<Array<File>>([])

    useEffect(() => {
      // it means means that someone hit save and new file has been uploaded
      // in this case fliesToUpload should be cleared.
      // This happens when user turns off redirect after new/edit
      if (
        (typeof key === 'string' && key !== originalKey)
          || (typeof key !== 'string' && !originalKey)
          || (typeof key !== 'string' && Array.isArray(key) && key.length !== originalKey.length)
      ) {
        setOriginalKey(key)
        setFilesToUpload([])
      }
    }, [key, originalKey])

    const onUpload = (files: Array<File>): void => {
      setFilesToUpload(files)
      onChange(custom.fileProperty, files)
    }

    const handleRemove = () => {
      onChange(custom.fileProperty, null)
    }

    return (
      <FormGroup>
        <Label>{property.label}</Label>
        <DropZone
          onChange={onUpload}
          multiple={custom.multiple}
          validate={{
            mimeTypes: custom.mimeTypes as Array<string>,
            maxSize: custom.maxSize,
          }}
          files={filesToUpload}
        />
        {key && path && !filesToUpload.length && file !== null && (
          <DropZoneItem filename={key} src={path} onRemove={handleRemove} />
        )}
      </FormGroup>
    )
  }

  const files = flat.get(params, custom.fileProperty)
  const [filesToUpload, setFilesToUpload] = useState<Array<File>>([])

  const onUpload = (uploadedFiles: Array<File>): void => {
    setFilesToUpload(uploadedFiles)
    const recordFiles = flat.get(record.params, custom.fileProperty) || []
    const newFiles = [
      ...recordFiles,
      ...uploadedFiles.filter(
        (file) => !filesToUpload.find(
          (f) => file.name === f.name && file.lastModified === f.lastModified,
        ),
      ),
    ]
    setFilesToUpload(uploadedFiles)
    onChange(custom.fileProperty, newFiles)
  }

  const handleMultiRemove = (index) => {
    const filesToDelete = flat.get(record.params, `${custom.filesToDeleteProperty}.${custom.fileProperty}`) || []
    if (
      files && files.length > 0
    ) {
      const newFiles = files.map((file, i) => {
        if (i === index) {
          return {
            ...file,
            [custom.filePathProperty]: null,
          }
        }
        return file
      })
      let newParams = flat.set(
        record.params,
        `${custom.filesToDeleteProperty}.${custom.fileProperty}`,
        [...filesToDelete, index],
      )
      newParams = flat.set(newParams, custom.fileProperty, newFiles)
      onChange({
        ...record,
        params: newParams,
      })
    } else {
      // eslint-disable-next-line no-console
      console.log('You cannot remove file when there are no uploaded files yet')
    }
  }

  return (
    <FormGroup error={!!error}>
      <Label required={property.isRequired}>{property.label}</Label>
      <DropZone
        onChange={onUpload}
        multiple={custom.multiple}
        validate={{
          mimeTypes: custom.mimeTypes as Array<string>,
          maxSize: custom.maxSize,
        }}
        files={filesToUpload}
      />
      {custom.multiple && files && files.length ? (
        <>
          {files.map((file, index) => (file && file[custom.filePathProperty] ? (
          // when we remove items we set only path index to nulls.
          // key is still there. This is because
          // we have to maintain all the indexes. So here we simply filter out elements which
          // were removed and display only what was left
            <DropZoneItem
              key={file[custom.keyProperty]}
              filename={custom.fileNameProperty
                ? file[custom.fileNameProperty]
                : file[custom.keyProperty]}
              src={file[custom.filePathProperty]}
              onRemove={() => handleMultiRemove(index)}
            />
          ) : ''))}
        </>
      ) : ''}
      <FormMessage>{error && error.message}</FormMessage>
    </FormGroup>
  )
}

export default Edit
