
import { Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import React from 'react';
import { IProject } from './ProjectList.model';

const ProjectListComponent = ({ projects }: { projects: IProject[] }) => {
  return (
    <TableContainer>
      <Table size='sm'>
        <Thead>
          <Tr>
            <Th>Description</Th>
          </Tr>
        </Thead>
        <Tbody>
          {projects.map(({id, description}) => (
            <Tr key={id}>
              <Td>{description}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}


export default ProjectListComponent;
