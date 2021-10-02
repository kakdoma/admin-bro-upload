import React, { FC } from 'react'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Icon, Button, Box } from '@adminjs/design-system'

import { ShowPropertyProps, flat } from 'adminjs'
import { ImageMimeTypes, AudioMimeTypes } from '../types/mime-types.type'
import PropertyCustom from '../types/property-custom.type'

type Props = ShowPropertyProps & {
  width?: number | string;
};

type SingleFileProps = {
  name: string,
  path?: string,
  mimeType?: string,
  width?: number | string;
}

const SingleFile: FC<SingleFileProps> = (props) => {
  const { name, path, mimeType, width } = props
  if (path && path.length) {
    if (mimeType && ImageMimeTypes.includes(mimeType as any)) {
      return <img src={path} style={{ maxHeight: width, maxWidth: width }} alt={name} />
    }
    if (mimeType && AudioMimeTypes.includes(mimeType as any)) {
      return (
        <audio
          controls
          src={path}
        >
          Your browser does not support the
          <code>audio</code>
          <track kind="captions" />
        </audio>
      )
    }
  }
  return (
    <Box>
      <Button as="a" href={path} ml="default" size="sm" rounded target="_blank">
        <Icon icon="DocumentDownload" color="white" mr="default" />
        {name}
      </Button>
    </Box>
  )
}

const File: FC<Props> = ({ width, record, property }) => {
  const { custom } = property as unknown as { custom: PropertyCustom }

  if (!custom.multiple) {
    const path = flat.get(record?.params, custom.filePathProperty)

    if (!path) {
      return null
    }

    const name = flat.get(
        record?.params,
        custom.fileNameProperty ? custom.fileNameProperty : custom.keyProperty,
    )
    const mimeType = custom.mimeTypeProperty && flat.get(record?.params, custom.mimeTypeProperty)

    if (!property.custom.multiple) {
      return <SingleFile path={path} name={name} width={width} mimeType={mimeType} />
    }
  }

  const files = flat.get(record?.params, custom.fileProperty)
  if (!files || !files.length) {
    return null
  }

  return (
    <Box flex flexDirection="column" style={{ gap: 10 }}>
      {files.map((file) => (
        <SingleFile
          key={file[custom.keyProperty]}
          path={file[custom.filePathProperty]}
          name={custom.fileNameProperty && file[custom.fileNameProperty]}
          width={300}
          mimeType={custom.mimeTypeProperty && file[custom.mimeTypeProperty]}
        />
      ))}
    </Box>
  )
}

export default File
