
import ProjectListComponent from './ProjectList.component';
import { useEffect, useState } from 'react';
import { db } from '../../db';
import { IProject } from './ProjectList.model';
import { Spinner } from '@chakra-ui/react';



const ProjectList = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<IProject[]>([]);

  useEffect(() => {
    const getProjects = async () => {
      const { data, error } = await db.project().select("*");
      if (error) {
        console.error(error.message)
      }
      if (!data || data.length == 0) {
        console.error("Response contains no data")
      }
      if (data) {
        setProjects(data.map((item) => {
          return {
            id: item.id!,
            description: item.description!,
            createdAt: item.createdAt!
          }
        }));
        console.log(data);
        setLoading(false)
      }
    }
    getProjects();
  }, []);


  return (
    <>
      {loading ? (<Spinner />) : (<ProjectListComponent projects={projects} />)}
    </>
  )

}

export default ProjectList;